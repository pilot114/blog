<template>
  <div class="block">{{ text }}</div>
</template>

<script>
export default {
  props: {
    text: String
  },
  data() {
    return {
      html: null
    }
  },
}
</script>

<style scoped>
.block {
  color: black;
  background-color: lightgray;
  padding: 1em;
  margin: 1em 0;
  border-radius: .5em;
}
</style>
