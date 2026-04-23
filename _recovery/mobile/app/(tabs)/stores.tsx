import { StoresScreen } from '../../components/stores/StoresScreen';

// Expo Router treats this file as the `/app/stores` route. The
// actual implementation lives in `components/stores/` so the route
// folder stays a thin map of URLs → screens, and the feature can
// grow (search bar, chips, cards, …) without polluting routing.
export default StoresScreen;
