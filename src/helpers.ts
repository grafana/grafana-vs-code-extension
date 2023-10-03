import * as http from "http";

export function interceptResponse(
  proxyRes: http.IncomingMessage,
  res: http.ServerResponse<http.IncomingMessage>,
  bodyFunc: (body: string) => string | Promise<string>,
) {
  let body = Buffer.from([]);
  proxyRes.on("data", function (data) {
    body = Buffer.concat([body, data]);
  });
  proxyRes.on("end", async function () {
    res.end(await bodyFunc(body.toString("utf8")));
  });
}

export function parseCookies(cookies: string) {
  const cookiesObj = {} as any;
  for (const cookie of cookies.split("; ")) {
    const key = cookie.split("=").shift();
    if (key) {
      const value = cookie.split("=").slice(1).join("=");
      cookiesObj[key] = value;
    }
  }
  return cookiesObj;
}

export function unparseCookies(obj: any) {
  let cookies = "";
  for (const key in obj) {
    if (!cookies) {
      cookies = `${key}=${obj[key]}`;
    } else {
      cookies = `; ${key}=${obj[key]}`;
    }
  }
  return cookies;
}

export function overrideCookies(
  originalCookies: string,
  overrideCookies: string | undefined,
) {
  const cookieObj = {} as any;
  if (originalCookies) {
    const originalObj = parseCookies(originalCookies);
    console.log("Original cookies", originalObj);
    for (const key in originalObj) {
      cookieObj[key] = originalObj[key];
    }
  }
  if (overrideCookies) {
    const overrideObj = parseCookies(overrideCookies);
    console.log("Overriden cookies", overrideObj);
    for (const key in overrideObj) {
      cookieObj[key] = overrideObj[key];
    }
  }
  return unparseCookies(cookieObj);
}
