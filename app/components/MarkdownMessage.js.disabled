import React from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import Markdown from 'react-native-markdown-display';
// Temporarily disable syntax highlighting to fix the build
// import SyntaxHighlighter from 'react-native-syntax-highlighter';
// import { docco, dark } from 'react-syntax-highlighter/styles/hljs';

const MarkdownMessage = ({ content, isUser = false, isDarkMode = false }) => {
  // Choose colors based on user/AI and theme
  const textColor = isUser ? '#fff' : (isDarkMode ? '#e0e0e0' : '#333');
  const codeBackgroundColor = isDarkMode ? '#2d2d2d' : '#f4f4f4';
  const codeTextColor = isDarkMode ? '#e0e0e0' : '#666';
  const blockquoteBackground = isDarkMode ? '#2d2d2d' : '#f0f0f0';
  // const syntaxTheme = isDarkMode ? dark : docco;

  const markdownStyles = {
    body: {
      color: textColor,
      fontSize: 16,
      lineHeight: 22,
    },
    heading1: {
      fontSize: 24,
      fontWeight: 'bold',
      marginVertical: 8,
      color: textColor,
    },
    heading2: {
      fontSize: 20,
      fontWeight: 'bold',
      marginVertical: 6,
      color: textColor,
    },
    heading3: {
      fontSize: 18,
      fontWeight: 'bold',
      marginVertical: 4,
      color: textColor,
    },
    strong: {
      fontWeight: 'bold',
      color: textColor,
    },
    em: {
      fontStyle: 'italic',
      color: textColor,
    },
    blockquote: {
      backgroundColor: blockquoteBackground,
      borderLeftWidth: 4,
      borderLeftColor: '#4CAF50',
      paddingLeft: 12,
      paddingVertical: 8,
      marginVertical: 8,
    },
    code_inline: {
      backgroundColor: codeBackgroundColor,
      color: codeTextColor,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 14,
    },
    fence: {
      backgroundColor: codeBackgroundColor,
      borderRadius: 8,
      padding: 12,
      marginVertical: 8,
    },
    code_block: {
      backgroundColor: codeBackgroundColor,
      borderRadius: 8,
      padding: 12,
      marginVertical: 8,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 14,
      color: codeTextColor,
    },
    list_item: {
      flexDirection: 'row',
      marginVertical: 4,
    },
    bullet_list: {
      marginLeft: 12,
    },
    ordered_list: {
      marginLeft: 12,
    },
    hr: {
      backgroundColor: isDarkMode ? '#444' : '#e0e0e0',
      height: 1,
      marginVertical: 16,
    },
    table: {
      borderWidth: 1,
      borderColor: isDarkMode ? '#444' : '#e0e0e0',
      marginVertical: 8,
    },
    thead: {
      backgroundColor: isDarkMode ? '#2d2d2d' : '#f5f5f5',
    },
    tbody: {},
    th: {
      borderWidth: 1,
      borderColor: isDarkMode ? '#444' : '#e0e0e0',
      padding: 8,
      fontWeight: 'bold',
      color: textColor,
    },
    td: {
      borderWidth: 1,
      borderColor: isDarkMode ? '#444' : '#e0e0e0',
      padding: 8,
      color: textColor,
    },
    tr: {
      borderBottomWidth: 1,
      borderColor: isDarkMode ? '#444' : '#e0e0e0',
    },
    link: {
      color: '#4CAF50',
      textDecorationLine: 'underline',
    },
    paragraph: {
      marginVertical: 4,
      color: textColor,
    },
    listUnorderedItemIcon: {
      color: textColor,
      marginLeft: 10,
      marginRight: 10,
      fontSize: 16,
    },
    listOrderedItemIcon: {
      color: textColor,
      marginLeft: 10,
      marginRight: 10,
      fontSize: 16,
    },
  };

  const rules = {
    fence: (node, children, parent, styles) => {
      const language = node.sourceInfo || 'javascript';
      const codeContent = node.content || '';
      
      // For code blocks, temporarily disabled syntax highlighting
      // if (language && language !== 'text') {
      //   return (
      //     <View key={node.key} style={[styles.fence, { marginVertical: 8 }]}>
      //       <SyntaxHighlighter
      //         language={language}
      //         style={syntaxTheme}
      //         fontSize={14}
      //         customStyle={{
      //           backgroundColor: codeBackgroundColor,
      //           padding: 12,
      //           borderRadius: 8,
      //         }}
      //       >
      //         {codeContent}
      //       </SyntaxHighlighter>
      //     </View>
      //   );
      // }
      
      // For plain text code blocks
      return (
        <View key={node.key} style={styles.fence}>
          <Text style={{
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            fontSize: 14,
            color: codeTextColor,
          }}>
            {codeContent}
          </Text>
        </View>
      );
    },
    // Custom rendering for inline code
    code_inline: (node, children, parent, styles) => {
      return (
        <Text key={node.key} style={styles.code_inline}>
          {node.content}
        </Text>
      );
    },
    // Ensure lists render properly
    list_item: (node, children, parent, styles) => {
      return (
        <View key={node.key} style={styles.list_item}>
          <Text>{children}</Text>
        </View>
      );
    },
  };

  // Clean up the content before rendering
  const cleanContent = (text) => {
    if (!text) return '';
    
    // Remove excessive line breaks
    let cleaned = text.replace(/\n{3,}/g, '\n\n');
    
    // Fix common markdown issues
    cleaned = cleaned.replace(/\*\*\*/g, '**'); // Triple asterisks to double
    cleaned = cleaned.replace(/\|\|/g, '|'); // Double pipes to single
    cleaned = cleaned.replace(/^-{4,}$/gm, '---'); // Multiple dashes to three
    
    return cleaned.trim();
  };

  const processedContent = cleanContent(content);

  return (
    <View style={styles.container}>
      <Markdown 
        style={markdownStyles} 
        rules={rules}
        mergeStyle={true}
      >
        {processedContent}
      </Markdown>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default MarkdownMessage;
