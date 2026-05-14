server:
	npm run dev

build:
	npm run build

docker:
	docker build -t openairtech/map .

clean:
	rm -rf dist
