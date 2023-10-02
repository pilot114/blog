<template>
  <div>
    <Block text="Последняя статья"/>
    <markdown path="babylon/webRender"/>
  </div>
</template>

<script>
import Block from '@/components/Block.vue'
import Markdown from '@/components/Markdown.vue'

export default {
  name: 'home',
  components: {
    Markdown,
    Block,
  }
}
</script>
