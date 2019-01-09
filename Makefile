build:
	docker build . -t base-myblog
start:
	docker run --rm -d -v $(PWD):/blog -p 8080:8080 -p 8000:8000 --name myblog base-myblog
enter:
	docker exec -it -u workspace myblog bash
stop:
	docker stop myblog
