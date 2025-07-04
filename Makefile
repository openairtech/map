SRC_DIR := src
DEV_DIR := ../dev
REL_DIR := release

PUB_SRV := openair.city
PUB_DIR := /var/www/openair.city

HUGO := hugo
RSYNC := rsync

server:
	$(HUGO) server -wDs $(SRC_DIR) -d $(DEV_DIR)

build:
	$(HUGO) -s $(SRC_DIR)

publish: build
	$(RSYNC) -avz --delete $(REL_DIR)/ $(PUB_SRV):$(PUB_DIR)

docker:
	docker build -t openairtech/map .

clean:
	rm -rf $(REL_DIR)
