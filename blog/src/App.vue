<template>
  <div id="app">
    <div id="nav">
      <router-link to="/">Home</router-link> |
      <router-link to="/author">Author</router-link>
    </div>
    <transition name="fade" mode="out-in">
      <keep-alive>
        <router-view/>
      </keep-alive>
    </transition>
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
.fade-enter-active, .fade-leave-active {
  transition: opacity .1s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}
</style>
