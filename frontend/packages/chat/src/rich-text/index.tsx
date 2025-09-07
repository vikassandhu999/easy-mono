import React, {PropsWithChildren} from 'react';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {PlainTextPlugin} from '@lexical/react/LexicalPlainTextPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {TextChangePlugin} from './TextChangePlugin';
import {SendPlugin} from './SendPlugin';
import {LexicalEditor} from 'lexical'; // Added EditorState
import {EditorRefPlugin} from '@lexical/react/LexicalEditorRefPlugin';
import {ClearEditorPlugin} from '@lexical/react/LexicalClearEditorPlugin';
import {Box, Group} from '@mantine/core';

type Props = {
    onUpdate: (content: {content: string}) => void; // content is plain text
    onSend: () => void;
    onSetup: (instance: LexicalEditor | null) => void;
} & PropsWithChildren;

// Mobile-first responsive styles for the rich text editor
const placeholderStyles: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '12px',
    transform: 'translateY(-50%)',
    color: 'var(--mantine-color-dimmed)',
    fontSize: '14px',
    lineHeight: '1.4',
    pointerEvents: 'none',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 'calc(100% - 24px)',
};

// ContentEditable styling optimized for mobile with enhanced UX
const contentEditableStyles: React.CSSProperties = {
    padding: '10px 12px',
    borderRadius: '20px',
    backgroundColor: 'var(--mantine-color-gray-0)',
    color: 'var(--mantine-color-dark-7)',
    position: 'relative',
    display: 'flex',
    width: '100%',
    minHeight: '40px',
    boxSizing: 'border-box',
    flexDirection: 'column',
    outline: 'none',
    border: '1px solid var(--mantine-color-gray-3)',
    maxHeight: '120px',
    overflowX: 'hidden',
    overflowY: 'auto',
    lineHeight: '1.4',
    fontSize: '16px', // Set to 16px to prevent iOS zoom
    resize: 'none',
    WebkitOverflowScrolling: 'touch',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    fontFamily: 'inherit',
    wordWrap: 'break-word',
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
};

export function RichTextEditor({onUpdate, onSend, children, onSetup}: Props) {
    const initialConfig = {
        namespace: 'RichTextEditor',
        theme: {
            ltr: 'text-left',
            rtl: 'text-right',
            placeholder: 'placeholder-class',
            paragraph: 'paragraph-class',
        },
        onError: (error: Error) => {
            console.error('Lexical Error:', error);
        },
    };

    // Handler for TextChangePlugin to pass plain text content
    const handleTextChange = (_editor: LexicalEditor, textContent: string) => {
        onUpdate({content: textContent});
    };

    return (
        <LexicalComposer initialConfig={initialConfig}>
            <Group
                gap="xs"
                align="flex-end"
                wrap="nowrap"
                style={{
                    width: '100%',
                    padding: '8px 0',
                }}
            >
                <Box
                    style={{
                        position: 'relative',
                        flex: 1,
                        minWidth: 0,
                    }}
                >
                    <PlainTextPlugin
                        contentEditable={
                            <ContentEditable
                                style={contentEditableStyles}
                                data-placeholder="Type a message..."
                                spellCheck={true}
                                autoCorrect="on"
                                autoCapitalize="sentences"
                                autoComplete="off"
                                // Remove the onFocus and onBlur handlers
                            />
                        }
                        placeholder={<Placeholder text="Type a message..." />}
                        ErrorBoundary={LexicalErrorBoundary}
                    />
                    <HistoryPlugin />
                    <TextChangePlugin onUpdate={handleTextChange} />
                    <SendPlugin onSend={onSend} />
                    <EditorRefPlugin editorRef={onSetup} />
                    <ClearEditorPlugin />
                </Box>
                {/* Children (e.g., Send Button) will be placed here by the parent Input.tsx */}
                {children}
            </Group>
        </LexicalComposer>
    );
}

// Custom placeholder component with mobile-optimized styling
function Placeholder({text}: {text: string}) {
    return <div style={placeholderStyles}>{text}</div>;
}
