<template>
  <div class="app-layout">
    <main class="main-content">
      <NuxtPage />
    </main>
  </div>
</template>

<style>
@import '~/assets/styles/variables.css';

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #__nuxt {
  height: 100%;
}

body {
  font-family: var(--font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
  font-size: var(--text-base, 15px);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color 0.3s, color 0.3s;
}

.app-layout {
  display: flex;
  height: 100%;
}

.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
}

@media (max-width: 768px) {
  .main-content {
    width: 100%;
  }
}
</style>
