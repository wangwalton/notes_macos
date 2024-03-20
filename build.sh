cd ../waltonwang
./install_python_app.sh

cd ../waltonwang-ui
yarn buildc

cd ../notes_macos
git stash && npm version patch && git stash pop
npm run release