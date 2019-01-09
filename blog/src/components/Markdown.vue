<template>
  	<div v-html="html"></div>
</template>

<script>
import marked from 'marked'
import Vue from 'vue'
import hljs from 'highlight.js'
import javascript from 'highlight.js/lib/languages/javascript'
// import 'highlight.js/styles/agate.css'
// import 'highlight.js/styles/railscasts.css'
// import 'highlight.js/styles/zenburn.css'
import 'highlight.js/styles/darcula.css'

export default {
  props: {
    path: String
  },
  data() {
  	return {
  		html: null
  	}
  },
  created() {
  	hljs.registerLanguage('javascript', javascript)

  	marked.setOptions({
  		highlight: function(code) {
			return hljs.highlightAuto(code).value
		},
		langPrefix: 'hljs language-'
  	})

  	let path = '/posts/' + this.path + '.md'
	Vue.axios.get(path).then((response) => {
		this.html = marked(response.data)
	})
  }
}
</script>

<style scoped>
</style>
