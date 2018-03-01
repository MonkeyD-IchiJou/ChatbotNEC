import os
from flask import Flask, request, jsonify
import json
import yaml
import shutil

from rasa_core.agent import Agent
from rasa_core.policies.keras_policy import KerasPolicy
from rasa_core.policies.memoization import MemoizationPolicy

# init the flask app
app = Flask(__name__)
allagents = {}


def traindialogue(projectName):
  global allagents
  # setting up the project path (where to output my model).. /app/dialogues/_project_name
  projectPath = "/app/dialogues/" + projectName

  # get the path of my nlu model
  nluPath = "/nluprojects/" + projectName + "/model"

  # turn stories into a file
  tmpstoriesPath = '/usr/' + projectName + '_stories.yml'
  storiesfile = open(tmpstoriesPath, 'w+')
  storiesfile.write(request.get_json()['stories'])
  storiesfile.close()

  # turn domain into yml format file
  tmpdomainPath = '/usr/' + projectName + '_domain.yml'
  domainfile = open(tmpdomainPath, 'w+')
  yaml.dump(request.get_json()['domain'], domainfile, default_flow_style=False)

  # prepare the agent
  additional_arguments = {"epochs": 300, "max_history": 3}
  agent = Agent(tmpdomainPath, policies=[MemoizationPolicy(), KerasPolicy()], featurizer=None, interpreter=nluPath)
  agent.train(
    tmpstoriesPath,
    projectPath,
    True,
    **additional_arguments
  )
  # store or update this agent into my global list
  allagents[projectName] = agent


@app.route('/training', methods=['POST'])
def training():
  global allagents
  traindialogue(request.get_json()['projectName'])
  return jsonify(success=True, status='ready')


@app.route('/deleteProject', methods=['POST'])
def deleteProject():
  global allagents
  projectName = request.get_json()['projectName']
  allagents.pop(projectName, None)
  # delete the project path
  projectPath = "/app/dialogues/" + projectName
  nluPath = "/nluprojects/" + projectName
  shutil.rmtree(projectPath, True, None)
  shutil.rmtree(nluPath, True, None)
  return jsonify(success=True, status='ready')


@app.route('/startmsg', methods=['POST'])
def startmsg():
  global allagents
  projectName = request.get_json()['projectName']
  if projectName in allagents:
    return jsonify(allagents[projectName].start_message_handling(text_message=request.get_json()['text_message'], sender_id=request.get_json()['sender_id']))
  else:
    return jsonify(errors='no such agents')


@app.route('/executedAct', methods=['POST'])
def executedAct():
  global allagents
  projectName = request.get_json()['projectName']
  if projectName in allagents:
    return jsonify(allagents[projectName].continue_message_handling(sender_id=request.get_json()['sender_id'], executed_action=request.get_json()['executed_action'], events=[]))
  else:
    return jsonify(errors='no such agents')


# run my flask app
if __name__ == '__main__':
  # firstly load all the existing project in my dir fi
  allprojectsPath = [x[1] for x in os.walk("/app/dialogues")][0]
  allnlusPath = [y[1] for y in os.walk("/nluprojects/")][0]
  localcount = 0
  for projectpath in allprojectsPath:
    if projectpath == allnlusPath[localcount]:
      allagents[projectpath] = Agent.load("/app/dialogues/" + projectpath, interpreter="/nluprojects/" + projectpath + "/model")
    localcount+=1
  app.run(host='0.0.0.0', port=80, debug=True)
