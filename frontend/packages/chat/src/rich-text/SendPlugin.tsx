import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {COMMAND_PRIORITY_LOW, KEY_ENTER_COMMAND} from 'lexical';
import {useEffect} from 'react';

type Props = {
  onSend: () => void;
};

export function SendPlugin({onSend}: Props): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (!event) {
          return false;
        }

        if (event.shiftKey) {
          // Allow default behavior for Shift+Enter (new line)
          return false;
        }

        // When sending a message with "Enter", prevent default behavior
        event.preventDefault();
        onSend();

        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, onSend]);

  return null;
}
