import { AccountGate, PreferencesForm } from "./account";
import { BrowserNotifications } from "./browser-notifications";

export function AlertsPage() {
  return (
    <AccountGate>
      <div className="page-wrap narrow">
        <h1>Alerts</h1>
        <section className="panel" aria-labelledby="alert-preferences-heading">
          <h2 id="alert-preferences-heading">Alert preferences</h2>
          <PreferencesForm />
        </section>
        <section aria-label="Browser notifications">
          <BrowserNotifications embedded />
        </section>
      </div>
    </AccountGate>
  );
}
