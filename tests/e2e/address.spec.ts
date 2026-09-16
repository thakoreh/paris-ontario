import { test, expect } from '@playwright/test';
test('address selection previews real coordinates and requires pin confirmation', async ({page}) => {
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
