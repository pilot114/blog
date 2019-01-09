<template>
  <div class="home">
    <!-- <img alt="Vue logo" src="../assets/logo.png"> -->
    <markdown path="2019-01-08-test"/>
  </div>
</template>

<script>
import Markdown from '@/components/Markdown.vue'

export default {
  name: 'home',
  components: {
    Markdown
  }
}
</script>
