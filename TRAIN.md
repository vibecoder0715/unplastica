# Train the first Unplastica camera model

This is a small image classifier for a prototype. It can recognize the seven habit photo types and an `other` class. It is not a human reviewer, and a high score does not prove that a plastic-free action really happened. Test it carefully before using real Greenbits.

## What you need

- A computer with 8 GB of graphics memory (VRAM) and 24 GB of normal memory is enough for this model.
- Python 3.10 or newer.
- A recent PyTorch and matching TorchVision install. Use the official PyTorch install selector so it chooses the right CUDA version for your graphics card. If CUDA is not available, training can use the CPU but will be slower.
- Gradio can make a simple upload-and-preview screen, but it is not the trainer. Use the training command below on your computer, or run the same steps in a GPU notebook such as Google Colab.

## 1. Collect and sort photos

Use photos that people have agreed may be used for this project. Remove names, location data, and faces where possible. Do not use photos from the web unless you have permission to train on them.

Make this folder layout. The folder names must match exactly:

```text
data/
  train/
    box_cutlery/
    recycle_bags/
    self_bottle_refill/
    greenery_furniture/
    handicraft_projects/
    beeswax_food_wraps/
    bulk_pantry_refill/
    other/
  val/
    box_cutlery/
    recycle_bags/
    self_bottle_refill/
    greenery_furniture/
    handicraft_projects/
    beeswax_food_wraps/
    bulk_pantry_refill/
    other/
```

`train` is for learning. `val` is for checking photos the model has not seen. Do not put frames from the same video, or photos of the same single setup, into both folders. A useful first trial has a few hundred varied photos per class. Include difficult examples: dim light, different phones, different backgrounds, empty scenes, and photos that look similar but do not show the habit. The `other` folder is important.

## 2. Install and train on your computer

Open PowerShell or Terminal in the project folder:

```powershell
cd ml
python -m venv .venv
# Windows:
.\.venv\Scripts\Activate.ps1
# macOS/Linux instead:
# source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Install PyTorch and TorchVision for your CUDA version using the command from the official PyTorch selector if the requirements install did not include a CUDA build. Check whether PyTorch sees your GPU:

```powershell
python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU mode')"
```

From the `ml` folder, start training:

```powershell
python train.py --data data --epochs 12 --batch-size 16 --output model/best.pt
```

If you see an out-of-memory error, close other GPU programs and try `--batch-size 8`. The first run downloads the small MobileNet starting weights. The trained file is saved as `ml/model/best.pt`; it is not committed to Git.

## 3. Check it before trusting it

The printed validation accuracy is only a first check. Try the model on a new set of photos from different people and phones. For each class, count:

- Correct approvals: the photo is really that habit and the model says so.
- False approvals: the photo does not show the habit, but the model gives it a high score. These are the most important errors to reduce.
- Misses: a real habit photo is rejected.

Keep a separate review set that was not used for training or validation. Check results by class and lighting, and look closely at the `other` class. Do not raise points or set the 0.85 score threshold based only on a good average accuracy. A score is the model's confidence, not a guarantee. The server starts with an 85% threshold; change it only after measuring false approvals with real test photos and documenting the decision.

## 4. Run the private scoring service

From `ml`, set a long random secret outside Git, then start the service:

```powershell
$env:ML_SCORER_API_KEY = "replace-with-a-long-random-secret"
$env:MODEL_PATH = "model/best.pt"
python -m uvicorn service:app --host 127.0.0.1 --port 8000
```

The service has `/health` and a protected `/score` endpoint. The Supabase `verify-scan` Edge Function calls `/score` and checks its label and score on the server. Never put the model key in the browser. If you host the scorer somewhere else, use HTTPS, set the same random key in the host and Supabase Edge Function secrets, and do not expose an unauthenticated upload endpoint. The browser still cannot choose the score or points.

## 5. Training on a hosted GPU notebook

Upload the project training files and your consented image folders to a private GPU notebook. Follow the host's privacy rules. Run the install, GPU check, and training commands from sections 2–3. Download `model/best.pt`, put it in `ml/model/`, and run the scoring service on a server with HTTPS. Do not make a public model endpoint until it has an API key and an upload-size limit.

The first model is a prototype, not a production proof system. Keep the 30-day photo deletion rule, tell users clearly how photos are used, and review mistaken approvals before a wider launch.
