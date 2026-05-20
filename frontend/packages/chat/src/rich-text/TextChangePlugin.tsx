import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

import {LexicalEditor} from 'lexical';
import {useEffect} from 'react';

type Props = {
  onUpdate: (editor: LexicalEditor, text: string) => void;
};

export function TextChangePlugin({onUpdate}: Props): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerTextContentListener((textContent) => {
      onUpdate(editor, textContent);
    });
  }, [editor, onUpdate]);

  return null;
}
