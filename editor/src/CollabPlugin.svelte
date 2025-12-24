<script>
  import { onMount, onDestroy } from 'svelte';
  import { useLexicalComposerContext } from 'svelte-lexical';
  import * as Y from 'yjs';
  import { WebsocketProvider } from 'y-websocket';
  import { createBinding } from '@lexical/yjs';

  let provider;
  let binding;
  let editor = useLexicalComposerContext();

  onMount(() => {
    console.log('Initializing collaboration...');
    const ydoc = new Y.Doc();

    // Use hostname to support iPad/LAN access
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = '1234'; // We could make this configurable

    provider = new WebsocketProvider(`${protocol}//${host}:${port}`, 'zen-post-1', ydoc);

    provider.on('status', event => {
      console.log('WS Status:', event.status);
    });

    // Bind Lexical <-> Yjs
    binding = createBinding(editor, provider, 'content', ydoc);
    console.log('Binding created');
  });

  onDestroy(() => {
    if (provider) {
      provider.disconnect();
    }
  });
</script>
