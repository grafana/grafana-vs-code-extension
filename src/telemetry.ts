import * as vscode from "vscode";
import axios from "axios";
import {v4 as uuidv4} from 'uuid';
import * as util from "./util";

const LAST_UPDATED_DATE = "lastUpdatedDate";
const INSTALLATION_UUID = "installUUID";
const URL = "https://stats.grafana.org/vscode-extension";

/*
 * Sends a single anonymous telemetry call once per month, allowing tracking of
 * usage - reports on first opening of a dashboard each month.
 */
export async function sendTelemetry(ctx: vscode.ExtensionContext) {

    const lastUpdatedDate = ctx.globalState.get<string | undefined>(LAST_UPDATED_DATE);
    const today = new Date();

    if (lastUpdatedDate === undefined) {
        const uuid = uuidv4();
        await sendEvent("first", uuid);
        ctx.globalState.update(LAST_UPDATED_DATE, today);
        ctx.globalState.update(INSTALLATION_UUID, uuid);
    } else {
        if (differentDay(new Date(lastUpdatedDate), today)) {
            let uuid = ctx.globalState.get(INSTALLATION_UUID);
            if (uuid === undefined) {
                uuid = uuidv4();
                ctx.globalState.update(INSTALLATION_UUID, uuid);
            }
            await sendEvent("subsequent", uuid as string);
            ctx.globalState.update(LAST_UPDATED_DATE, today);
        }
    }
}

function differentDay(d1: Date, d2: Date) {
    return d1.getDay() !== d2.getDay() &&
           d1.getMonth() !== d2.getMonth() &&
           d1.getFullYear() !== d2.getFullYear();
}

async function sendEvent(eventType: string, uuid: String) {
    try {
        const data = {
            uuid: uuid,
            eventType: eventType,
            extensionVersion: util.getVersion(),
        };
        await axios.post(URL, data, {
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'User-Agent': util.getUserAgent(),
            },
        });
    } catch(e) {
        console.log("Telemetry error", e, "for event", eventType);
    }
}