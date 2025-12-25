/** @odoo-module **/

import { registry } from "@web/core/registry";
import { WorkflowPilotDevApp } from "./dev_demo_app";

// Register the WorkflowPilotDevApp as a client action
registry.category("actions").add("workflow_pilot.dev_app", WorkflowPilotDevApp);
