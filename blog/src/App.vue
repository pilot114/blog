<template>
  <div id="app">
    <div id="nav">
      <router-link to="/">Главная</router-link> |
      <router-link to="/articles">Статьи</router-link> |
      <router-link to="/notes">Заметки</router-link> |
      <router-link to="/about">Автор</router-link>
    </div>
    <router-view/>
  </div>
</template>

<style>
#app {
  font-family: 'Source Sans Pro', sans-serif;
  color: #2c3e50;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  text-align: justify;
}
</style>
<script>
</script>