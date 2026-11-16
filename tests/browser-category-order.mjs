import { chromium, webkit } from "../.agenda-local/ui/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";
const base = "http://127.0.0.1:5173";
const engine = process.env.TEST_WEBKIT ? webkit : chromium;
const browser = await engine.launch(engine === chromium ? { executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true } : { headless: true });
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
    await context.route("**/*", r => new URL(r.request().url()).origin === base ? r.continue() : r.abort());
    const page = await context.newPage(); page.setDefaultTimeout(60000);
    let categoryId, serviceId;
    const api = async (path, method = "GET", data) => {
      const response = await context.request.fetch(base + "/api/agenda" + path, { method, data, headers: { Origin: base } });
      assert.ok(response.ok(), await response.text()); return response.json();
    };
    try {
      assert.equal((await api("/catalog")).payment_mode, "mock");
      await page.goto(base + "/admin");
      await page.getByLabel("Contraseña", { exact: true }).fill("test-password");
      await page.getByRole("button", { name: "Entrar", exact: true }).click();
      await page.getByRole("button", { name: "Tratamientos y cuidados", exact: true }).click();
      const original = await api("/admin/categories");
      const name = "Orden prueba " + Date.now();
      await page.getByRole("button", { name: "Crear categoría", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Nombre de la categoría").fill(name);
      await dialog.getByLabel("Posición", { exact: true }).locator("option").first().waitFor({ state: "attached" });
      assert.equal(await dialog.getByLabel("Posición", { exact: true }).locator("option").count(), original.length + 1);
      await dialog.getByLabel("Posición", { exact: true }).selectOption("1");
      await dialog.getByRole("button", { name: "Guardar categoría", exact: true }).click();
      await dialog.waitFor({ state: "hidden" });
      const categories = await api("/admin/categories");
      assert.equal(categories[0].name, name); categoryId = categories[0].id;
      const [service] = await api("/admin/services");
      const { id, version, ...body } = service; void id; void version;
      serviceId = (await api("/admin/services", "POST", { ...body, category_id: categoryId, name: "Tratamiento de orden" })).id;
      await page.goto(base + "/tratamientos");
      await page.locator(".treatment-category h2").first().waitFor();
      assert.equal(await page.locator(".treatment-category h2").first().innerText(), name.toUpperCase());
      const style = await page.evaluate(() => ({ category: getComputedStyle(document.querySelector(".treatment-category h2")).fontSize, treatment: getComputedStyle(document.querySelector(".treatment-row h3")).fontSize, transform: getComputedStyle(document.querySelector(".treatment-category h2")).textTransform }));
      assert.equal(style.category, style.treatment); assert.equal(style.transform, "uppercase");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: ".agenda-local/category-order-" + engine.name() + (mobile ? "-mobile" : "-desktop") + ".png", fullPage: true });
      await page.goto(base + "/reservar");
      await page.getByLabel("Categoría", { exact: true }).locator("option").first().waitFor({ state: "attached" });
      assert.equal(await page.getByLabel("Categoría", { exact: true }).locator("option").first().getAttribute("value"), String(categoryId));
      assert.equal(await page.getByLabel("Categoría", { exact: true }).inputValue(), String(categoryId));
      await page.goto(base + "/admin");
      await page.getByRole("button", { name: "Tratamientos y cuidados", exact: true }).click();
      await page.getByLabel("Filtrar por categoría").selectOption(String(categoryId));
      await page.getByRole("button", { name: "Editar categoría", exact: true }).click();
      await dialog.getByLabel("Posición", { exact: true }).selectOption(String(categories.length));
      await dialog.getByRole("button", { name: "Guardar categoría", exact: true }).click();
      await dialog.waitFor({ state: "hidden" });
      await page.goto(base + "/tratamientos");
      await page.locator(".treatment-category h2").filter({ hasText: name }).waitFor();
      assert.equal(await page.locator(".treatment-category h2").last().innerText(), name.toUpperCase());
      await page.goto(base + "/reservar");
      await page.getByLabel("Categoría", { exact: true }).locator("option").first().waitFor({ state: "attached" });
      assert.equal(await page.getByLabel("Categoría", { exact: true }).locator("option").last().getAttribute("value"), String(categoryId));
      assert.equal(await page.getByLabel("Categoría", { exact: true }).inputValue(), await page.getByLabel("Categoría", { exact: true }).locator("option").first().getAttribute("value"));
      await page.goto(base + "/reservar?tratamiento=" + serviceId);
      await page.getByLabel("Categoría", { exact: true }).locator("option").first().waitFor({ state: "attached" });
      assert.equal(await page.getByLabel("Categoría", { exact: true }).inputValue(), String(categoryId));
      console.log(engine.name(), mobile ? "mobile" : "desktop", "PASS: create/move category, both public orders, first category default, uppercase and matching font size");
    } finally {
      if (serviceId) await api("/admin/services/" + serviceId, "DELETE");
      if (categoryId) await api("/admin/categories/" + categoryId, "DELETE");
      await context.close();
    }
  }
} finally { await browser.close(); }
