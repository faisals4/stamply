<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);
// Boot the kernel enough for routes to load
$kernel->bootstrap();

$router = $app->make('router');
echo "=== routes matching 'app' ===\n";
foreach ($router->getRoutes() as $r) {
    $u = $r->uri();
    if (preg_match('#^app#', $u)) {
        echo $u." | methods=".implode(",",$r->methods())." | where=".json_encode($r->wheres)."\n";
        try {
            echo "  regex=".$r->toSymfonyRoute()->compile()->getRegex()."\n";
        } catch (\Throwable $e) {
            echo "  (regex compile failed: ".$e->getMessage().")\n";
        }
    }
}
