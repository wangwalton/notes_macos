backendTarget:
	echo "backend"
	cd ../waltonwang && ./install_python_app.sh

frontendTarget:
	echo "frontend"
	cd ../waltonwang-ui && yarn buildc

pack: frontendTarget backendTarget
	echo "pack"
	yarn pak
	open dist

# release:  backend frontend
# 	git stash && npm version patch && git stash pop
# 	npm run release