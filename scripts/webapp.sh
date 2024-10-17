
set -e


sudo mkdir -p /home/csye6225/webapp
sudo mkdir -p /var/log/webapp
sudo chown csye6225:csye6225 /var/log/webapp


sudo unzip /tmp/webapp.zip -d /home/csye6225/webapp

sudo rm /tmp/webapp.zip


sudo npm install --prefix /home/csye6225/webapp/


sudo chown -R csye6225:csye6225 /home/csye6225/webapp/


sudo cp /home/csye6225/webapp/webapp.service /etc/systemd/system/webapp.service


sudo systemctl daemon-reload
sudo systemctl start webapp
sudo systemctl enable webapp
