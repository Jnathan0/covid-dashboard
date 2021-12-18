FROM node:latest 
ADD ./ ~/covid-dash
WORKDIR ~/covid-dash
EXPOSE 3000
RUN npm install -a 
RUN npm install sass --legacy-peer-deps
WORKDIR ~/covid-dash
CMD ["yarn", "develop"]