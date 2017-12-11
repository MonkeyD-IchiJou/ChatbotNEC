FROM nginx:1.12.1

RUN rm /etc/nginx/conf.d/*

ADD certs/nginx-selfsigned.crt      /etc/ssl/certs/
ADD certs/nginx-selfsigned.key      /etc/ssl/private/
ADD certs/dhparam.pem               /etc/ssl/certs/
ADD proxy.conf                      /etc/nginx/conf.d/
ADD static                          /home/static/