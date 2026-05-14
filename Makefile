PUB_SRV := openair.city
PUB_DIR := /var/www/openair.city

server:
	npm run dev

build:
	npm run build

publish: build
	rsync -avz --delete dist/ $(PUB_SRV):$(PUB_DIR)

docker:
	docker build -t openairtech/map .

clean:
	rm -rf dist
