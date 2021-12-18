FROM node:latest 
ADD ./ ~/covid-dash
WORKDIR ~/covid-dash
RUN npm install -a 
RUN npm install sass --legacy-peer-deps
RUN yarn develop