import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
  ActionBarPrimitive,
  AssistantRuntimeProvider,
  useLocalRuntime,
} from '@assistant-ui/react';

// Color palette - Consistent with existing theme
const colors = {
  bgPrimary: '#121212',
  bgSecondary: '#1E1E1E',
  textPrimary: '#ECECEC',
  textSecondary: '#A0A0A0',
  accentPositive: '#4ECCA3',
  accentNegative: '#F05454',
  accentNeutral: '#A0A0A0',
  accentData: '#30A5FF',
  divider: '#333333',
};

// Custom adapter for your AI service
const CustomAIAdapter = {
  async *run({ messages, abortSignal }) {
    try {
      // Replace with your actual API endpoint
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messages.map(m => ({
            role: m.role,
            content: m.content
              .filter(c => c.type === "text")
              .map(c => c.text)
              .join(" "),
          })),
        }),
        signal: abortSignal,
      });

      const reader = response.body.getReader();
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        text += chunk;
        
        yield {
          content: [{ type: "text", text }],
        };
      }
    } catch (error) {
      console.error('AI Chat Error:', error);
      yield {
        content: [{ 
          type: "text", 
          text: "I apologize, but I encountered an error. Please try again." 
        }],
      };
    }
  },
};

const EnhancedAIChat = ({ visible, onClose, initialMessage }) => {
  const runtime = useLocalRuntime(CustomAIAdapter);

  // Custom components adapted for React Native
  const UserMessage = () => (
    <MessagePrimitive.Root style={styles.userMessage}>
      <View style={styles.messageContent}>
        <ActionBarPrimitive.Root
          hideWhenRunning
          autohide="not-last"
          style={styles.actionBar}
        >
          <ActionBarPrimitive.Edit>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="edit" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </ActionBarPrimitive.Edit>
        </ActionBarPrimitive.Root>

        <View style={styles.messageBubble}>
          <MessagePrimitive.Parts />
        </View>
      </View>
    </MessagePrimitive.Root>
  );

  const AssistantMessage = () => (
    <MessagePrimitive.Root style={styles.assistantMessage}>
      <View style={styles.avatarContainer}>
        <MaterialIcons name="auto-awesome" size={24} color={colors.accentData} />
      </View>

      <View style={styles.messageContent}>
        <View style={styles.messageBubble}>
          <MessagePrimitive.Parts />
        </View>

        <ActionBarPrimitive.Root
          hideWhenRunning
          autohide="not-last"
          style={styles.actionBar}
        >
          <ActionBarPrimitive.Copy>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="content-copy" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </ActionBarPrimitive.Copy>
          <ActionBarPrimitive.Reload>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="refresh" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </ActionBarPrimitive.Reload>
        </ActionBarPrimitive.Root>
      </View>
    </MessagePrimitive.Root>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <AssistantRuntimeProvider runtime={runtime}>
            <ThreadPrimitive.Root style={styles.threadRoot}>
              <ThreadPrimitive.Viewport style={styles.threadViewport}>
                <ThreadPrimitive.Empty>
                  <View style={styles.emptyStateContainer}>
                    <MaterialIcons 
                      name="auto-awesome" 
                      size={48} 
                      color={colors.accentData} 
                    />
                    <Text style={styles.emptyStateText}>
                      {initialMessage || "How can I help you today?"}
                    </Text>
                  </View>
                </ThreadPrimitive.Empty>

                <ThreadPrimitive.Messages
                  components={{
                    UserMessage,
                    AssistantMessage,
                  }}
                />
              </ThreadPrimitive.Viewport>

              <ComposerPrimitive.Root style={styles.composerRoot}>
                <ComposerPrimitive.Input
                  placeholder="Type your message..."
                  style={styles.composerInput}
                  multiline
                  maxHeight={100}
                />
                
                <ThreadPrimitive.If running={false}>
                  <ComposerPrimitive.Send>
                    <TouchableOpacity style={styles.sendButton}>
                      <MaterialIcons name="send" size={24} color={colors.bgPrimary} />
                    </TouchableOpacity>
                  </ComposerPrimitive.Send>
                </ThreadPrimitive.If>

                <ThreadPrimitive.If running>
                  <ComposerPrimitive.Cancel>
                    <TouchableOpacity style={styles.sendButton}>
                      <MaterialIcons name="stop" size={24} color={colors.bgPrimary} />
                    </TouchableOpacity>
                  </ComposerPrimitive.Cancel>
                </ThreadPrimitive.If>
              </ComposerPrimitive.Root>
            </ThreadPrimitive.Root>
          </AssistantRuntimeProvider>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
  },
  modalContainer: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  closeButton: {
    padding: 5,
  },
  threadRoot: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
  },
  threadViewport: {
    flex: 1,
    padding: 20,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyStateText: {
    color: colors.textPrimary,
    fontSize: 18,
    marginTop: 15,
    textAlign: 'center',
  },
  userMessage: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  assistantMessage: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  messageContent: {
    flex: 1,
    maxWidth: '80%',
  },
  messageBubble: {
    backgroundColor: colors.bgPrimary,
    borderRadius: 16,
    padding: 12,
    marginBottom: 5,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 5,
  },
  actionButton: {
    padding: 5,
    marginHorizontal: 2,
  },
  composerRoot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.bgSecondary,
  },
  composerInput: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    borderRadius: 20,
    padding: 12,
    color: colors.textPrimary,
    fontSize: 14,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentData,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default EnhancedAIChat;