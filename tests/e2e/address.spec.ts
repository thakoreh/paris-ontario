import { test, expect } from '@playwright/test';
test('address selection previews real coordinates and requires pin confirmation', async ({page}) => {
 // Photon is an external service. Set PLAYWRIGHT_MOCK_PHOTON=1 when it is
 // unreachable so the UI flow is still exercised against a labelled fixture.
 if (process.env.PLAYWRIGHT_MOCK_PHOTON === '1') {
  await page.route('**/api/address?q=*', (route) => route.fulfill({
   status: 200,
   contentType: 'application/json',
   body: JSON.stringify({ suggestions: [{
    id: 'test-fixture-1',
    label: 'Test fixture: Grand River Street North, Paris, ON',
    address: 'Grand River Street North, Paris, ON',
    postalCode: '',
    latitude: 43.1939,
    longitude: -80.3846,
   }] }),
  }));
 }
 await page.goto('/app/locations/new');
 const responsePromise=page.waitForResponse(r=>r.url().includes('/api/address?q=') && r.status()===200);
 await page.getByRole('textbox',{name:'Search home address'}).fill('Grand River Street');
 const response=await responsePromise;
 const {suggestions}=await response.json();
 expect(suggestions.length).toBeGreaterThan(0);
 await page.getByRole('listbox',{name:'Address suggestions'}).getByRole('option').first().click();
 await expect(page.getByLabel('Latitude',{exact:true})).toHaveValue(String(suggestions[0].latitude));
 await expect(page.getByLabel('Longitude',{exact:true})).toHaveValue(String(suggestions[0].longitude));
 await expect(page.getByRole('region',{name:'Choose a location on the map'}).locator('.leaflet-overlay-pane path.leaflet-interactive')).toHaveCount(1);
 await expect(page.getByRole('checkbox',{name:'I’ve checked this map location.'})).not.toBeChecked();
 await expect(page.getByText('Typed searches are sent to Photon')).toBeVisible();
});
