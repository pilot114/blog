build:
	docker build . -t base-myblog
start:
	docker run --rm -d -v $(PWD)/myblog:/blog -p 4000:4000 --name myblog base-myblog
stop:
	docker stop myblog
