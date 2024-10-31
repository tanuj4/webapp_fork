#!/bin/bash

echo "Downloading CloudWatch Agent..."
cd ~ 
ls 

if wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb; then
    echo "CloudWatch Agent downloaded successfully!"
else
    echo "Failed to download CloudWatch Agent. Exiting..."
    exit 1
fi


if sudo dpkg -i ./amazon-cloudwatch-agent.deb; then
    echo "CloudWatch Agent installed successfully!"
else
    echo "Failed to install CloudWatch Agent. Exiting..."
    exit 1
fi


rm -f ./amazon-cloudwatch-agent.deb


echo "Copying the CloudWatch configuration file to /opt directory..."
if sudo cp /home/csye6225/webapp/cloudwatch-config.json /opt/cloudwatch-config.json; then
    echo "Configuration file copied successfully!"
else
    echo "Failed to copy configuration file. Exiting..."
    exit 1
fi

echo "Starting CloudWatch Agent..."
if sudo systemctl start amazon-cloudwatch-agent; then
    echo "CloudWatch Agent started successfully!"
else
    echo "Failed to start CloudWatch Agent. Exiting..."
    exit 1
fi

sudo systemctl enable amazon-cloudwatch-agent
echo "CloudWatch Agent is enabled to start on boot."

echo "CloudWatch Agent setup completed successfully!"
