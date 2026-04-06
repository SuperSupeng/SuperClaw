import { defineConfig } from "vitepress";

export default defineConfig({
  title: "SuperClaw",
  description: "Build your digital workforce in minutes",

  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "API", link: "/api/" },
      { text: "Examples", link: "/examples/" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Introduction",
          items: [
            { text: "Getting Started", link: "/guide/getting-started" },
            { text: "Core Concepts", link: "/guide/concepts" },
          ],
        },
        {
          text: "Architecture",
          items: [
            { text: "Design Principles", link: "/guide/design-principles" },
          ],
        },
        {
          text: "Configuration",
          items: [
            { text: "Configuration Reference", link: "/guide/configuration" },
            { text: "CLI Tools", link: "/guide/cli-tools" },
            { text: "Migration from OpenClaw", link: "/guide/migration" },
          ],
        },
        {
          text: "Agent Packages",
          items: [
            { text: "@superclaw/core", link: "/guide/packages/core" },
            { text: "@superclaw/cli", link: "/guide/packages/cli" },
            { text: "@superclaw/channel-cli", link: "/guide/packages/channel-cli" },
            { text: "@superclaw/channel-discord", link: "/guide/packages/channel-discord" },
            { text: "create-superclaw", link: "/guide/packages/create-superclaw" },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/SuperSupeng/SuperClaw" },
    ],

    footer: {
      message: "Released under the Apache 2.0 License.",
      copyright: "Copyright 2024-2026 SuperClaw Contributors",
    },

    search: {
      provider: "local",
    },
  },
});
