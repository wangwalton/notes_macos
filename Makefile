backend:
	cd ../waltonwang && ./install_python_app.sh

frontend:
	cd ../waltonwang-ui && yarn buildc

pack: backend frontend
	npm run pack

release:  backend frontend
	git stash && npm version patch && git stash pop
	npm run release