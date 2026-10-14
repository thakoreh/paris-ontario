import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import NoticeMap from "@/components/notice-map";

it("renders the map container, County sources and inline notice failure together", () => {
  const html = renderToStaticMarkup(
    <NoticeMap notices={[]} exploreLayers noticeError onRetryNotices={() => {}} />,
  );
  expect(html).toContain('class="leaflet-map"');
  expect(html).toContain('role="region"');
  expect(html).toContain('role="status" class="map-notice-error"');
  expect(html).toContain("Notices couldn&#x27;t load. County layers are still shown.");
  expect(html).toContain("Retry");
  expect(html).toContain('aria-label="Map data sources"');
});

it("omits the notice error after recovery", () => {
  const html = renderToStaticMarkup(<NoticeMap notices={[]} exploreLayers />);
  expect(html).toContain('class="leaflet-map"');
  expect(html).not.toContain("map-notice-error");
});
