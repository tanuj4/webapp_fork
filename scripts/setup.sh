
set -e


export DEBIAN_FRONTEND=noninteractive


sudo apt-get update


sudo apt-get install -y unzip curl


curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs


node --version


sudo apt-get install -y mysql-server


MYSQL_ROOT_PASSWORD="${DB_ROOT_PASSWORD}"
DB_USER="${DB_USER}"
DB_USER_PASSWORD="${DB_USER_PASSWORD}"
DB_NAME="${DB_NAME}"


sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '${MYSQL_ROOT_PASSWORD}';"


sudo mysql -e "DELETE FROM mysql.user WHERE User='';"
sudo mysql -e "DROP DATABASE IF EXISTS test;"
sudo mysql -e "FLUSH PRIVILEGES;"


sudo mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME};"


if ! sudo mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "SELECT User FROM mysql.user WHERE User='${DB_USER}';" | grep -q "${DB_USER}"; then
    sudo mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_USER_PASSWORD}';"
    sudo mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';"
    sudo mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "FLUSH PRIVILEGES;"
else
    echo "User '${DB_USER}' already exists. Skipping user creation."
fi

sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${MYSQL_ROOT_PASSWORD}';"


echo "MySQL installation and configuration completed."