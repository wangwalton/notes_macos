backendTarget:
	echo "backend"
	cd ../waltonwang && ./install_python_app.sh

frontendTarget:
	echo "frontend"
	cd ../waltonwang-ui && yarn buildc

pack: frontendTarget backendTarget
	echo "pack"
	yarn pak


copyAndLaunchApp: pack
	osascript -e 'tell application "Joystick" to quit'
	rm -rf /Applications/Joystick.app
	mv ./dist/mac/Joystick.app /Applications/Joystick.app


# release:  backend frontend
# 	git stash && npm version patch && git stash pop
# 	npm run releaseo