from typing import Annotated
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages
from langchain.chat_models import init_chat_model
from langgraph.graph import StateGraph, START, END
from langchain_core.messages import AIMessage, SystemMessage

# Initialize LLM with your model (e.g., 'gpt-4o')
llm = init_chat_model(model_provider="openai", model="gpt-4o")

# Define the state type
class State(TypedDict):
    messages: Annotated[list, add_messages]
    resume_content: str  # Resume text for context

def chatbot(state: State) -> State:
    messages = state["messages"]
    resume_content = state.get("resume_content", "")

    # Inject resume content as system message context before conversation
    if resume_content:
        messages = messages + [SystemMessage(content=f"Resume context:\n{resume_content}")]

    # Call the LLM with the prepared messages
    response = llm.invoke(messages)

    # Append the AI response to the messages for the next turn
    new_messages = messages + [response]

    return {
        "messages": new_messages,
        "resume_content": resume_content
    }

def create_chat_graph(checkpointer=None):
    builder = StateGraph(State)

    # Add a single chatbot node
    builder.add_node("chatbot", chatbot)

    # Connect start -> chatbot -> end
    builder.add_edge(START, "chatbot")
    builder.add_edge("chatbot", END)

    # Compile with or without checkpointer
    if checkpointer:
        return builder.compile(checkpointer=checkpointer)
    else:
        return builder.compile()
