/** @odoo-module **/

import { mount } from "@odoo/owl";
import { WorkflowPilotDevApp } from "./dev_demo_app";

function shouldMountDevApp() {
    // Avoid side effects in normal backend pages.
    if (!window.__WORKFLOW_PILOT_DEV__) return false;
    return Boolean(document.getElementById("workflow_pilot_dev_root"));
}

async function mountDevApp() {
    const target = document.getElementById("workflow_pilot_dev_root");
    if (!target) return;

    // Minimal env for this playground. Add services later if needed.
    await mount(WorkflowPilotDevApp, target, { env: {} });
}

if (shouldMountDevApp()) {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mountDevApp);
    } else {
        mountDevApp();
    }
}
