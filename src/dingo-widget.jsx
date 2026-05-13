import React from "react";
import { createRoot } from "react-dom/client";
import { DingoApp } from "./DingoApp.jsx";
import styles from "../styles.css?inline";

const elementName = "dingo-app";
const assetBase = new URL("./", import.meta.url).href;
const defaultAiEndpoint = "/functions/dingoAi";

class DingoAppElement extends HTMLElement {
  connectedCallback() {
    if (this.root) {
      return;
    }

    window.__DINGO_ASSET_BASE__ = this.getAttribute("asset-base") || assetBase;
    window.__DINGO_AI_ENDPOINT__ = this.getAttribute("ai-endpoint") ||
      window.__DINGO_AI_ENDPOINT__ ||
      defaultAiEndpoint;

    const shadow = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host {
        all: initial;
        position: static;
        display: contents;
      }

      .blank-page {
        display: none;
      }

      ${styles}
    `;

    const mount = document.createElement("div");
    mount.setAttribute("part", "root");
    shadow.append(style, mount);

    this.root = createRoot(mount);
    this.root.render(
      <React.StrictMode>
        <DingoApp />
      </React.StrictMode>,
    );
  }

  disconnectedCallback() {
    if (!this.root) {
      return;
    }

    this.root.unmount();
    this.root = undefined;
  }
}

if (!customElements.get(elementName)) {
  customElements.define(elementName, DingoAppElement);
}
