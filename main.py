from dotenv import load_dotenv
import os
load_dotenv()

TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY")
TOGETHER_CHAT_URL = "https://api.together.xyz/v1/chat/completions"
TOGETHER_MODEL = "mistralai/Mistral-7B-Instruct-v0.2"

from flask import Flask, render_template, request, jsonify
import requests
import json

app = Flask(__name__)

# --- System prompts per language ---
SYSTEM_PROMPTS = {
    "en": "You are ByteBack, a helpful and empathetic legal chatbot trained in Pakistan's cybercrime laws. Speak clearly, sound like ChatGPT, and respond in friendly English.",
    "ur": "آپ ByteBack ہیں، پاکستان کے سائبر کرائم قوانین میں تربیت یافتہ ایک مددگار چیٹ بوٹ۔ آپ سادہ، ہمدرد اور اردو میں جواب دیں۔",
    "roman": "Aap ByteBack hain, Pakistan ke cybercrime qawaneen mein trained aik madadgar chatbot. Roman Urdu mein friendly aur clear jawab dein."
}

# --- Load context from JSON files ---
def get_context_from_json(lang):
    filename = {
        "en": "qa_english.json",
        "ur": "qa_urdu.json",
        "roman": "qa_roman_urdu.json"
    }.get(lang, "qa_english.json")

    if not os.path.exists(filename):
        return ""

    try:
        with open(filename, encoding="utf-8") as f:
            data = json.load(f)
        context = "\n".join([f"Q: {x['question']}\nA: {x['answer']}" for x in data])
        return context
    except Exception as e:
        print("Error loading context:", e)
        return ""

# --- Home route ---
@app.route("/")
def index():
    return render_template("index.html")

# --- Chat route ---
@app.route("/chat", methods=["POST"])
def chat():
    user_msg = request.form.get("message", "").strip()
    lang = request.form.get("lang", "en")
    chat_history = request.form.get("history", "[]")

    if not user_msg:
        return jsonify({"reply": "⚠️ No message received."}), 400

    try:
        parsed_history = json.loads(chat_history)
    except Exception:
        parsed_history = []

    context = get_context_from_json(lang)
    system_prompt = SYSTEM_PROMPTS.get(lang, SYSTEM_PROMPTS["en"]) + \
        "\n\nUse the following questions and answers as your knowledge base. If the question is unrelated, politely say you can't help.\n\n" + context

    messages = [{"role": "system", "content": system_prompt}]
    for msg in parsed_history:
        messages.append({"role": msg["role"], "content": msg["text"]})
    messages.append({"role": "user", "content": user_msg})

    try:
        response = requests.post(
            TOGETHER_CHAT_URL,
            headers={
                "Authorization": f"Bearer {TOGETHER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": TOGETHER_MODEL,
                "messages": messages,
                "temperature": 0.7,
                "top_p": 0.9,
                "max_tokens": 512
            },
            timeout=20
        )

        print("Together status:", response.status_code)
        print("Together raw response:", response.text)

        data = response.json()

        reply = None
        try:
            reply = data["choices"][0]["message"]["content"]
        except KeyError:
            try:
                reply = data["choices"][0]["text"]
            except KeyError:
                reply = "⚠️ Couldn't understand that."

        return jsonify({"reply": reply.strip()})

    except requests.exceptions.RequestException as e:
        print("RequestException:", e)
        return jsonify({"reply": "⚠️ Couldn't reach the model. Please try again later."}), 500
    except Exception as e:
        print("Error:", e)
        return jsonify({"reply": "⚠️ Unexpected error. Please try again."}), 500

# --- Run app ---
if __name__ == "__main__":
    app.run(debug=True)
