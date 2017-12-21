from flask import Flask, request, jsonify
import json

# init the flask app
app = Flask(__name__)


@app.route('/query', methods=['POST'])
def query():
    return jsonify(success=True, response=request.get_json()['projectName'])


@app.route('/something')
def something():
    return jsonify(success=True)


# run my flask app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80, debug=True)
