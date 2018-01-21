from flask import Flask, request, jsonify
import json
import rasa_core.train as rsTrain

# init the flask app
app = Flask(__name__)


@app.route('/training', methods=['POST'])
def training():
    return jsonify(status='ready')


# run my flask app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80, debug=True)
