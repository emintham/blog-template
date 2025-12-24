<script>
  import {
    LexicalComposer,
    ContentEditable,
    RichTextPlugin,
    HistoryPlugin
  } from 'svelte-lexical';
  import CollabPlugin from './CollabPlugin.svelte';

  let editorConfig = {
    namespace: 'ZenEditor',
    theme: {
      paragraph: 'editor-paragraph',
      text: {
        bold: 'editor-text-bold',
        italic: 'editor-text-italic',
        underline: 'editor-text-underline',
      },
    },
    onError: (error) => {
      console.error(error);
    },
  };
</script>

<div class="editor-container">
  <LexicalComposer initialConfig={editorConfig}>
    <RichTextPlugin>
      <div slot="contentEditable" class="editor-input">
        <ContentEditable />
      </div>
      <div slot="placeholder" class="editor-placeholder">
        Start writing...
      </div>
    </RichTextPlugin>
    <HistoryPlugin />
    <CollabPlugin />
  </LexicalComposer>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: 'Georgia', serif;
    background-color: #f9f9f9;
    color: #333;
  }

  .editor-container {
    max-width: 740px;
    margin: 4rem auto;
    padding: 2rem;
    background: white;
    min-height: 80vh;
    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
  }

  .editor-input {
    min-height: 150px;
    outline: none;
    font-size: 1.2rem;
    line-height: 1.8;
  }

  .editor-placeholder {
    color: #999;
    position: absolute;
    top: 2rem;
    pointer-events: none;
    font-style: italic;
  }

  :global(.editor-paragraph) {
    margin-bottom: 1rem;
  }
</style>
