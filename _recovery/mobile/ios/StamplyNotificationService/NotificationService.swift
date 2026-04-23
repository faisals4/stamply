//
//  NotificationService.swift
//  StamplyNotificationService
//
//  This Notification Service Extension wakes up whenever iOS receives a
//  push that has `"mutable-content": 1` in its APS payload (which the
//  backend always sets — see FcmTransport::buildCloudMessage). We use
//  it for one reason only: download the hero image the operator attached
//  in /op/notifications/send and attach it to the banner so the user
//  sees a rich notification instead of a plain text one.
//
//  FCM delivers the image URL in two places depending on how the message
//  was built. We check both so the extension is resilient to future
//  backend changes:
//    1. `fcm_options.image` — what the `kreait/firebase-php` SDK sets
//       when you pass `$imageUrl` to CloudMessage::withNotification().
//    2. `image` inside the APS aps.alert dictionary — fallback used by
//       some direct-APNs libraries; cheap to support.
//
//  iOS gives the extension ~30 seconds to finish. If the image download
//  hangs or fails we fall back to the plain banner via
//  `serviceExtensionTimeWillExpire`, so the user still sees the push.
//

import UserNotifications

class NotificationService: UNNotificationServiceExtension {

    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        self.contentHandler = contentHandler
        self.bestAttemptContent = request.content.mutableCopy() as? UNMutableNotificationContent

        guard let bestAttemptContent = bestAttemptContent else {
            contentHandler(request.content)
            return
        }

        // Extract the image URL from whichever payload location it lives in.
        let imageURL = extractImageURL(from: request.content.userInfo)

        guard let url = imageURL else {
            // No image attached — nothing to do, deliver the banner as-is.
            contentHandler(bestAttemptContent)
            return
        }

        // Download asynchronously so we don't block the extension.
        downloadAttachment(from: url) { attachment in
            if let attachment = attachment {
                bestAttemptContent.attachments = [attachment]
            }
            contentHandler(bestAttemptContent)
        }
    }

    override func serviceExtensionTimeWillExpire() {
        // iOS is about to kill us. Deliver whatever we have — the plain
        // banner without the image is better than nothing.
        if let contentHandler = contentHandler,
           let bestAttemptContent = bestAttemptContent {
            contentHandler(bestAttemptContent)
        }
    }

    // MARK: - Helpers

    /// Look for an image URL in any of the known payload shapes.
    private func extractImageURL(from userInfo: [AnyHashable: Any]) -> URL? {
        // 1. Firebase / FCM: `fcm_options.image`
        if let fcm = userInfo["fcm_options"] as? [String: Any],
           let imageString = fcm["image"] as? String,
           let url = URL(string: imageString) {
            return url
        }

        // 2. Direct APNs: `aps.alert.launch-image` (rare) or top-level
        //    `image` key set by custom sender implementations.
        if let imageString = userInfo["image"] as? String,
           let url = URL(string: imageString) {
            return url
        }

        return nil
    }

    /// Fetch the image, save it to a temp file, and wrap it in an
    /// UNNotificationAttachment. iOS requires attachments to live on disk
    /// (it won't accept a raw Data blob) and to have a correct file
    /// extension, so we sniff it from the URL path.
    private func downloadAttachment(
        from url: URL,
        completion: @escaping (UNNotificationAttachment?) -> Void
    ) {
        let task = URLSession.shared.downloadTask(with: url) { tempURL, response, error in
            guard let tempURL = tempURL, error == nil else {
                completion(nil)
                return
            }

            // Preserve the extension so UNNotificationAttachment can
            // infer the MIME type. If the URL has no extension, default
            // to .jpg — FCM accepts JPEG/PNG/GIF so this is a safe guess.
            let ext = url.pathExtension.isEmpty ? "jpg" : url.pathExtension
            let destination = URL(
                fileURLWithPath: NSTemporaryDirectory()
            ).appendingPathComponent("\(UUID().uuidString).\(ext)")

            do {
                try FileManager.default.moveItem(at: tempURL, to: destination)
                let attachment = try UNNotificationAttachment(
                    identifier: "stamply-push-image",
                    url: destination,
                    options: nil
                )
                completion(attachment)
            } catch {
                completion(nil)
            }
        }
        task.resume()
    }
}
