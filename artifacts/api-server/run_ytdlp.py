import os
import sys
import tempfile

local_tmp = os.path.abspath(os.path.join(os.path.dirname(__file__), "tmp"))
os.makedirs(local_tmp, exist_ok=True)

os.environ['TMPDIR'] = local_tmp
os.environ['TEMP'] = local_tmp
os.environ['TMP'] = local_tmp
os.environ['HOME'] = local_tmp
os.environ['XDG_CACHE_HOME'] = local_tmp
tempfile.tempdir = local_tmp

from yt_dlp import main
if __name__ == '__main__':
    sys.exit(main())
