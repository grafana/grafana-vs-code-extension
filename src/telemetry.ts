import * as vscode from "vscode";
import axios from "axios";
import * as util from "./util";

const LAST_UPDATED_DATE = "lastUpdatedDate";
const URL = "https://grafana.com/api/vscode-extension?event=${event}";

/*
 * Sends a single anonymous telemetry call once per month, allowing tracking of
 * usage - reports on first opening of a dashboard each month.
 */
export async function sendTelemetry(ctx: vscode.ExtensionContext) {

    const lastUpdatedDate = (ctx.globalState.get(LAST_UPDATED_DATE) as Date);

    const today = new Date();
    if (lastUpdatedDate === undefined) {
        await sendEvent("first");
        ctx.globalState.update(LAST_UPDATED_DATE, today);

    } else {
        if (monthDiff(today, lastUpdatedDate)>0) {
            await sendEvent("subsequent");
            ctx.globalState.update(LAST_UPDATED_DATE, today);
        }
    }
}

function monthDiff(d1: Date, d2: Date) {
    let months;
    months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();
    return months <= 0 ? 0 : months;
}

async function sendEvent(eventType: string) {
    try {
        const url = URL.replaceAll("${event}", eventType);
        await axios.head(url, {
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'User-Agent': util.getUserAgent(),
            },
        });
    } catch(e) {
        console.log("Telemetry error", e);
    }
}