# Mariadb microservice

pls rmb to back up the sql files

create docker-entrypoint-initdb.d folder and put .sql file for init and backup

- IF you want to dump all the tables datas from the mariadb container
    1. docker-compose exec dbserver bash
    2. mysqldump "$MYSQL_DATABASE" -uroot -p"$MYSQL_ROOT_PASSWORD" > /docker-entrypoint-initdb.d/backup-file.sql