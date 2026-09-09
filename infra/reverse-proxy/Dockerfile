FROM nginxinc/nginx-unprivileged:1.29-alpine

COPY infra/reverse-proxy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8443

CMD ["nginx", "-g", "daemon off;"]
