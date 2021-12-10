import ReactDOMServer from "react-dom/server";
import { RemixServer } from "remix";
import {
  getStylesheetPrefetchLinks,
  getModuleLinkHrefs
} from "@remix-run/react/links";

let ABORT_DELAY = 5000;

/**
 *
 * @param {*} request
 * @param {*} responseStatusCode
 * @param {*} responseHeaders
 * @param {import("@remix-run/server-runtime").EntryContext} remixContext
 * @param {*} loadContext
 * @returns
 */
export default async function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  remixContext,
  loadContext
) {
  /** @type {import("express").Response} */
  let body = loadContext.expressResponse;

  let response = new Response(body, {
    status: responseStatusCode,
    headers: responseHeaders
  });
  response.headers.set("Content-type", "text/html");

  let links = await getStylesheetPrefetchLinks(
    remixContext.matches,
    remixContext.routeModules,
    remixContext.manifest
  );
  let moduleLinks = getModuleLinkHrefs(
    remixContext.matches,
    remixContext.manifest
  );
  for (let link of links) {
    if (link.as === "style") {
      response.headers.append("Link", `<${link.href}>; rel=preload; as=style`);
    }
  }
  for (let link of moduleLinks) {
    response.headers.append("Link", `<${link.href}>; rel=modulepreload`);
  }

  await new Promise(resolve => {
    let finish = () => {
      body.on("ready", () => {
        console.log("ON HEADERS!!! PIPING!!!");
        pipe(body);
      });
      resolve();
    };

    let didError = false;
    const { pipe, abort } = ReactDOMServer.renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} />,
      {
        onCompleteShell() {
          console.log("onCompleteShell");
          response.status = didError ? 500 : 200;
          finish();
        },
        onError(error) {
          console.log("onError");
          didError = true;
          console.error("ON ERROR!!!", error);
          // finish();
        }
      }
    );

    setTimeout(abort, ABORT_DELAY);
  });

  return response;
  // let markup = ReactDOMServer.renderToString(
  //   <RemixServer context={remixContext} url={request.url} />
  // );

  // responseHeaders.set("Content-Type", "text/html");

  // return new Response("<!DOCTYPE html>" + markup, {
  //   status: responseStatusCode,
  //   headers: responseHeaders
  // });
}

export function handleDataRequest(response) {
  response.headers.set("x-hdr", "yes");
  return response;
}
