import {useEffect} from 'react';

import {LexicalEditor} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

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
